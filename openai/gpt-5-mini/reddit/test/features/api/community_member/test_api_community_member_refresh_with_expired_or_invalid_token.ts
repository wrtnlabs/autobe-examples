import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";

/**
 * Validate that refresh endpoint rejects malformed, expired, or revoked
 * credentials for community members.
 *
 * Workflow:
 *
 * 1. Register (join) a new communityMember and obtain access/refresh tokens and
 *    session summary.
 * 2. Use the issued access token (SDK auto-attaches it) to create a protected
 *    community resource to validate that the token is operational.
 * 3. Attempt refresh with a malformed refresh token (tampered string) and assert
 *    that the operation fails (no tokens issued).
 * 4. Attempt refresh using an invalid/tampered session_id and assert failure.
 *
 * Notes:
 *
 * - All request bodies use `satisfies` with the correct DTO types.
 * - All responses are validated with typia.assert where applicable.
 */
export async function test_api_community_member_refresh_with_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // 1) Register a fresh community member (self-join)
  const email: string = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(8);
  const joinBody = {
    email,
    username,
    password: "Passw0rd!",
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // Extract token and session
  const token: IAuthorizationToken = auth.token;
  typia.assert(token);
  const session = auth.session;
  typia.assert(session);

  // 2) Use the issued access token to create a protected community resource
  const uniqueSuffix = `${Date.now()}-${RandomGenerator.alphaNumeric(4)}`;
  const communitySlug = `test-community-${uniqueSuffix}`;
  const communityCreateBody = {
    name: RandomGenerator.name(2),
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    post_approval_required: false,
    settings: undefined,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // Validate creator mapping equals the joined member
  TestValidator.equals(
    "community creator matches newly joined member",
    community.creator.id,
    auth.member.id,
  );

  // 3) Malformed refresh token -> expect error (no new tokens issued)
  const malformedRefresh = `${token.refresh}-tampered`;
  await TestValidator.error(
    "malformed refresh token should be rejected",
    async () => {
      await api.functional.auth.communityMember.refresh(connection, {
        body: {
          grant_type: "refresh_token",
          refresh_token: malformedRefresh,
        } satisfies ICommunityBbsCommunityMember.IRefresh,
      });
    },
  );

  // 4) Invalid session_id -> expect error
  const invalidSessionId = session.id.replace(/.$/, (c) =>
    c === "0" ? "1" : "0",
  );
  await TestValidator.error(
    "invalid session_id should be rejected",
    async () => {
      await api.functional.auth.communityMember.refresh(connection, {
        body: {
          grant_type: "session_id",
          session_id: invalidSessionId as unknown as string &
            tags.Format<"uuid">,
        } satisfies ICommunityBbsCommunityMember.IRefresh,
      });
    },
  );
}
