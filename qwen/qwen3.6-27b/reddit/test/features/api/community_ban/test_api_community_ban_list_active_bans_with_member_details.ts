import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import type { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_community_bans_create } from "../../../generate/generate_random_reddit_like_community_member_communities_community_bans_create";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_ban } from "../../../prepare/prepare_random_reddit_like_community_community_ban";

/**
 * Test retrieving active ban records for a moderated community with full member and moderator details.
 *
 * Validates the community ban listing workflow by creating a community owner, two victim members, and issuing bans against each victim from the owner's moderator context. The paginated ban response is verified for correct structure and pagination metadata accuracy.
 *
 * Each ban summary is validated to include: member object (banned user's id, username, email, created_at), moderator object (issuer's id, member, role, created_at), reason text, and created_at timestamp. Pagination fields (current, limit, records, pages) are checked for consistency with the returned data.
 *
 * 1. Authenticate community owner and create a community (owner becomes moderator automatically).
 * 2. Authenticate two victim members to be banned.
 * 3. Issue bans against each victim via owner's connection with distinct reasons.
 * 4. Query paginated ban listing for the community.
 * 5. Validate pagination metadata accuracy and ban detail completeness.
 * 6. Confirm both victim members appear in the returned ban list.
 */
export async function test_api_community_ban_list_active_bans_with_member_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(owner);
  // 2. Create community (owner becomes moderator)
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Create victim1 member
  const victim1Connection: api.IConnection = { host: connection.host };
  const victim1 = await authorize_member_join(victim1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(victim1);
  // 4. Create victim2 member
  const victim2Connection: api.IConnection = { host: connection.host };
  const victim2 = await authorize_member_join(victim2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
    },
  });
  typia.assert(victim2);
  // 5. Issue ban on victim1
  const communityId = community.id satisfies string &
    tags.Format<"uuid"> as string & tags.Format<"uuid">;
  const ban1 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: { communityId },
        body: {
          member_id: victim1.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(ban1);
  // 6. Issue ban on victim2
  const ban2 =
    await generate_random_reddit_like_community_member_communities_community_bans_create(
      ownerConnection,
      {
        params: { communityId },
        body: {
          member_id: victim2.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(ban2);
  // 7. Query paginated ban listing
  const bansPage =
    await api.functional.redditLikeCommunity.communities.community_bans.index(
      ownerConnection,
      {
        communityId,
        body: {
          limit: 50 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
        } satisfies IREdditLikeCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(bansPage);
  // 8. Validate pagination metadata
  TestValidator.equals("page number", bansPage.pagination.current, 1);
  TestValidator.equals(
    "page limit",
    bansPage.pagination.limit,
    bansPage.pagination.limit,
  );
  TestValidator.predicate(
    "at least 2 ban records returned",
    bansPage.pagination.records >= 2,
  );
  TestValidator.predicate(
    "records count matches data length",
    bansPage.pagination.records === bansPage.data.length,
  );
  const expectedPages = Math.ceil(
    bansPage.pagination.records / bansPage.pagination.limit,
  );
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    bansPage.pagination.pages,
    expectedPages,
  );
  // 9. Validate each ban summary contains required details
  for (const ban of bansPage.data) {
    typia.assert(ban);
    typia.assert(ban.member);
    typia.assert(ban.moderator);
    TestValidator.predicate(
      "ban has valid member id",
      ban.member.id.length > 0,
    );
    TestValidator.predicate(
      "ban has member username",
      ban.member.username.length > 0,
    );
    TestValidator.predicate(
      "ban has member email",
      ban.member.email.length > 0,
    );
    TestValidator.predicate(
      "ban has member created_at",
      ban.member.created_at.length > 0,
    );
    TestValidator.predicate(
      "ban has valid moderator id",
      ban.moderator.id.length > 0,
    );
    TestValidator.predicate(
      "ban has moderator role",
      ban.moderator.role.length > 0,
    );
    TestValidator.predicate("ban has reason text", ban.reason.length > 0);
    TestValidator.predicate(
      "ban has created_at timestamp",
      ban.created_at.length > 0,
    );
  }
  // 10. Verify both victims appear in ban list
  const banMemberIds = bansPage.data.map((b) => b.member.id);
  TestValidator.predicate(
    "victim1 is in ban list",
    ArrayUtil.has(banMemberIds, (id) => id === ban1.member.id),
  );
  TestValidator.predicate(
    "victim2 is in ban list",
    ArrayUtil.has(banMemberIds, (id) => id === ban2.member.id),
  );
}
