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

export async function test_api_member_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const firstJoinBody = {
    email,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstMemberConnection, {
    body: firstJoinBody,
  });
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "registered email matches input",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "newly registered account is active",
    firstAuthorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "access token exists",
    firstAuthorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    firstAuthorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization header assigned after first join",
    typeof firstMemberConnection.headers?.Authorization === "string" &&
      firstMemberConnection.headers.Authorization.length > 0,
  );
  const originalId = firstAuthorized.id;
  const originalEmail = firstAuthorized.email;
  const originalCreatedAt = firstAuthorized.created_at;
  const originalUpdatedAt = firstAuthorized.updated_at;
  const originalDeletedAt = firstAuthorized.deleted_at;
  const originalAccessToken = firstAuthorized.token.access;
  const originalRefreshToken = firstAuthorized.token.refresh;
  const originalExpiredAt = firstAuthorized.token.expired_at;
  const originalRefreshableUntil = firstAuthorized.token.refreshable_until;
  const originalAuthorizationHeader =
    firstMemberConnection.headers?.Authorization;
  const duplicateJoinBody = {
    email,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const duplicateMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration is rejected",
    async () => {
      await authorize_member_join(duplicateMemberConnection, {
        body: duplicateJoinBody,
      });
    },
  );
  TestValidator.equals(
    "original authorized id remains unchanged",
    firstAuthorized.id,
    originalId,
  );
  TestValidator.equals(
    "original authorized email remains unchanged",
    firstAuthorized.email,
    originalEmail,
  );
  TestValidator.equals(
    "original created_at remains unchanged",
    firstAuthorized.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "original updated_at remains unchanged",
    firstAuthorized.updated_at,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "original deleted_at remains unchanged",
    firstAuthorized.deleted_at,
    originalDeletedAt,
  );
  TestValidator.equals(
    "original access token remains unchanged",
    firstAuthorized.token.access,
    originalAccessToken,
  );
  TestValidator.equals(
    "original refresh token remains unchanged",
    firstAuthorized.token.refresh,
    originalRefreshToken,
  );
  TestValidator.equals(
    "original token expiry remains unchanged",
    firstAuthorized.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.equals(
    "original refreshable deadline remains unchanged",
    firstAuthorized.token.refreshable_until,
    originalRefreshableUntil,
  );
  TestValidator.equals(
    "original authorization header is preserved",
    firstMemberConnection.headers?.Authorization,
    originalAuthorizationHeader,
  );
}
