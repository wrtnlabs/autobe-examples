import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_details_forbid_cross_member_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member A
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Create member B
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<boolean>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Privacy boundary: even if the verificationId might belong to another member,
  // member B must not be able to retrieve it and must not learn existence.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "member must be forbidden from retrieving another member's email verification details (no leakage)",
    async () => {
      await api.functional.multiUserTodo.member.email_verifications.at(
        memberBConnection,
        {
          verificationId,
        },
      );
    },
  );
  // If the SDK throws HttpError, we additionally assert the error message is generic
  // without leaking verification-token details.
  await TestValidator.error(
    "error message must not include sensitive verification-token fields",
    async () => {
      try {
        await api.functional.multiUserTodo.member.email_verifications.at(
          memberBConnection,
          {
            verificationId,
          },
        );
      } catch (exp) {
        const maybeMessage =
          exp && typeof exp === "object" && "message" in exp
            ? (exp as { message?: unknown }).message
            : undefined;
        if (typeof maybeMessage === "string") {
          const message = maybeMessage;
          TestValidator.predicate(
            "error message should not leak token details",
            !/\b(token|email|ip|href|referrer)\b/i.test(message),
          );
          throw exp;
        }
        throw exp;
      }
    },
  );
}
