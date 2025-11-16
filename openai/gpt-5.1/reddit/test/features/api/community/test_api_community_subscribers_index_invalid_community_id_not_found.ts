import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityMembership";

/**
 * Validate not-found behavior when listing subscribers for a non-existent
 * community.
 *
 * Business goal: Ensure that the subscribers index endpoint gracefully fails
 * when a client supplies a communityId that does not map to any existing
 * community row. A member user must be authenticated to exercise the endpoint,
 * but the failing call must use an unrelated random UUID that does not
 * correspond to the community created for baseline.
 *
 * Scenario steps:
 *
 * 1. Join as a memberUser using POST /auth/memberUser/join to establish an
 *    authenticated session.
 * 2. Optionally create a real community via POST
 *    /communityPlatform/memberUser/communities to ensure the database is in a
 *    healthy state, but do not reuse its id for the failing call.
 * 3. Generate a random UUID to act as an invalid communityId and construct a
 *    minimal ICommunityPlatformCommunityMembership.IRequest payload.
 * 4. Call PATCH /communityPlatform/communities/{communityId}/subscribers via
 *    api.functional.communityPlatform.communities.subscribers.index with that
 *    invalid communityId.
 * 5. Assert that the call fails by throwing an error using TestValidator.error,
 *    and that no successful page of membership data is produced.
 *
 * Note: Per framework rules, do not assert concrete HTTP status codes or
 * inspect error payload structure. Only validate that an error is thrown when a
 * non-existent communityId is used.
 */
export async function test_api_community_subscribers_index_invalid_community_id_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user so that subsequent
  // communityPlatform/memberUser endpoints can be called.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Optionally create a valid community for baseline; its id is not
  // used in the failing request.
  const createCommunityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: createCommunityBody,
      },
    );
  typia.assert(community);

  // 3. Generate a random UUID that is extremely unlikely to collide with
  // any existing community id. We rely on typia.random to satisfy the
  // uuid format requirement.
  const invalidCommunityId = typia.random<string & tags.Format<"uuid">>();

  // Ensure (in the very unlikely case) that we do not accidentally use
  // the real community id. If they match, regenerate once.
  const finalInvalidCommunityId =
    invalidCommunityId === community.id
      ? typia.random<string & tags.Format<"uuid">>()
      : invalidCommunityId;

  // Construct a minimal, but valid, membership request body. All fields
  // on IRequest are optional, so an empty object is acceptable.
  const requestBody =
    {} satisfies ICommunityPlatformCommunityMembership.IRequest;

  // 4 & 5. Invoke the subscribers index with the invalid community id and
  // assert that it fails by throwing an error rather than returning a
  // membership page.
  await TestValidator.error(
    "listing subscribers for non-existent community should fail",
    async () => {
      await api.functional.communityPlatform.communities.subscribers.index(
        connection,
        {
          communityId: finalInvalidCommunityId,
          body: requestBody,
        },
      );
    },
  );
}
