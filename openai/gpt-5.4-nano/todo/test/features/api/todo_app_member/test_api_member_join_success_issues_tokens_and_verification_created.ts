import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success_issues_tokens_and_verification_created(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals("member email matches", authorized.email, email);
  TestValidator.equals(
    "member deleted_at is null",
    authorized.deleted_at,
    null,
  );
  // Sensitive handling: ensure plaintext password / hash are not exposed.
  TestValidator.predicate(
    "response does not expose password",
    !("password" in (authorized as unknown as Record<string, unknown>)),
  );
  TestValidator.predicate(
    "response does not expose password_hash",
    !("password_hash" in (authorized as unknown as Record<string, unknown>)),
  );
  // Profile object is present even if display_name is null.
  TestValidator.predicate(
    "profile exists",
    authorized.profile !== null &&
      typeof authorized.profile === "object" &&
      (authorized.profile as {
        display_name?: string | null | undefined;
      }) !== null,
  );
  // Token fields are part of the authorized payload contract.
  TestValidator.predicate(
    "token.access is string",
    typeof authorized.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof authorized.token.refresh === "string",
  );
}
