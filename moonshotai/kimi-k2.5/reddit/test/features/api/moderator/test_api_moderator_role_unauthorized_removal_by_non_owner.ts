import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test that a non-owner moderator cannot remove another moderator from a community.
 *
 * Setup:
 * 1. Member A joins, creates community (becomes owner)
 * 2. Member B joins, added as moderator by owner A
 * 3. Member C joins, added as moderator by owner A
 * 4. Member B (moderator, not owner) attempts to remove Member C's moderator role
 *
 * Expected: HTTP 403 Forbidden - only the community owner may remove moderators
 */
export async function test_api_moderator_role_unauthorized_removal_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create Member A (will be community owner) - connection already has auth token
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Create Member B (will be a moderator)
  await authorize_member_join({ host: connection.host } as api.IConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const memberB = ownerConnection; // Store reference won't work - need fresh connection
  // Actually - we need to store member B's credentials separately. Let me restructure.
  // But looking at the API again - authorize_member_join requires connection with host only
  // and returns IAuthorized which has member info plus token. The connection gets Authorization header set.
  // Let me restart with correct flow:
  // Member A setup (owner)
  const ownerConn: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(ownerConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberAAuth);
  // Member B setup
  const memberBConn: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberBAuth);
  // Member C setup
  const memberCConn: api.IConnection = { host: connection.host };
  const memberCAuth = await authorize_member_join(memberCConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(memberCAuth);
  // Use ownerConn (Member A, already authenticated) to create community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConn,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
      },
    },
  );
  typia.assert(community);
  // Add Member B as moderator (by owner A)
  const moderatorB =
    await generate_random_reddit_like_moderator_moderators_create(ownerConn, {
      body: {
        communityId: community.id,
        memberId: memberBAuth.id,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorB);
  // Add Member C as moderator (by owner A)
  const moderatorC =
    await generate_random_reddit_like_moderator_moderators_create(ownerConn, {
      body: {
        communityId: community.id,
        memberId: memberCAuth.id,
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderatorC);
  // Verify both moderators have no deleted_at (active)
  TestValidator.equals(
    "moderator B should be active (deleted_at is null)",
    moderatorB.deleted_at,
    null,
  );
  TestValidator.equals(
    "moderator C should be active (deleted_at is null)",
    moderatorC.deleted_at,
    null,
  );
  // Member B (moderator, not owner) attempts to remove Member C's moderator role
  // Note: memberBConn already has authentication from the join operation
  await TestValidator.httpError(
    "non-owner moderator cannot remove another moderator",
    403,
    async () => {
      await api.functional.redditLike.moderator.moderators.erase(memberBConn, {
        moderatorId: moderatorC.id,
      });
    },
  );
  // Moderator C's role remains intact (the 403 prevented deletion)
  // The API documentation states only owner or self-removal is allowed
  // Since an error was thrown with 403, the deletion was blocked and moderatorC.deleted_at remains null
}
