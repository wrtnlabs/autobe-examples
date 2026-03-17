import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body,
  });
  typia.assert<ICommunityPlatformMember.IAuthorized>(authorized);
  TestValidator.equals(
    "joined member email matches request",
    authorized.email,
    body.email,
  );
  TestValidator.equals(
    "new member email is not verified",
    authorized.emailVerified,
    false,
  );
  TestValidator.equals(
    "new member has no previous sign-in",
    authorized.lastSignedInAt,
    null,
  );
  TestValidator.equals("new member is not deleted", authorized.deletedAt, null);
  TestValidator.notEquals("member id is populated", authorized.id, "");
  TestValidator.notEquals("member code is populated", authorized.code, "");
  TestValidator.notEquals("member status is populated", authorized.status, "");
  TestValidator.predicate(
    "member status is registration-active and not deleted-like",
    ["deleted", "inactive", "withdrawn", "banned", "suspended"].includes(
      authorized.status.toLowerCase(),
    ) === false,
  );
  TestValidator.predicate(
    "createdAt is a valid timestamp",
    Number.isNaN(new Date(authorized.createdAt).getTime()) === false,
  );
  TestValidator.predicate(
    "updatedAt is a valid timestamp",
    Number.isNaN(new Date(authorized.updatedAt).getTime()) === false,
  );
  TestValidator.notEquals(
    "access token is populated",
    authorized.token.access,
    "",
  );
  TestValidator.notEquals(
    "refresh token is populated",
    authorized.token.refresh,
    "",
  );
  TestValidator.predicate(
    "access token expiration is a valid timestamp",
    Number.isNaN(new Date(authorized.token.expired_at).getTime()) === false,
  );
  TestValidator.predicate(
    "refreshable deadline is a valid timestamp",
    Number.isNaN(new Date(authorized.token.refreshable_until).getTime()) ===
      false,
  );
  TestValidator.predicate(
    "refreshable deadline is same or later than access expiration",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
}
