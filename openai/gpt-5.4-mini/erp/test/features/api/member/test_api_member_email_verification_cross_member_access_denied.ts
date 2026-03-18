import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_cross_member_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(firstMember);
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(secondMember);
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "email verification lookup should require authorization",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.email_verifications.at(
        unauthorizedConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "member should not access a verification record without ownership context",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.email_verifications.at(
        firstMemberConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "second member lookup should not leak sensitive verification data through a random identifier",
    [401, 403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.email_verifications.at(
        secondMemberConnection,
        {
          emailVerificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
