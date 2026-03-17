import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for the new member
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate session context data using typia.random with appropriate tagged types
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register new member with session context using utility function
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Validate the authorization response
  typia.assert(authorized);
  // Verify token structure and expiration
  TestValidator.predicate(
    "token.access should be a non-empty string",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh should be a non-empty string",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at should be a valid ISO date-time string",
    authorized.token.expired_at > new Date().toISOString(),
  );
  TestValidator.predicate(
    "token.refreshable_until should be a valid ISO date-time string",
    authorized.token.refreshable_until > authorized.token.expired_at,
  );
  // Verify member profile matches registration
  TestValidator.equals(
    "member email should match registration email",
    authorized.email,
    memberConnection.headers?.Authorization?.toString().match(
      /^Bearer (.+)$/,
    )?.[1] ?? null,
  );
  TestValidator.predicate("member should have an ID", authorized.id.length > 0);
  TestValidator.predicate(
    "member username should be set",
    authorized.username.length > 0,
  );
  TestValidator.predicate(
    "member should have a registration timestamp",
    authorized.registered_at > new Date(Date.now() - 60000).toISOString(),
  );
  // Verify session context was accepted
  TestValidator.predicate(
    "connection should have Authorization header set",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "connection Authorization header should contain access token",
    typeof memberConnection.headers?.Authorization === "string" &&
      memberConnection.headers.Authorization.startsWith("Bearer "),
  );
}
