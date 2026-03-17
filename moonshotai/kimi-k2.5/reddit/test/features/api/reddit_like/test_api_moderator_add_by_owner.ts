import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Tests the primary success path where an owner creates a community and then
 * adds a new member as a moderator with can_add_moderators=false (default).
 *
 * Steps:
 * 1. Member joins the platform (this member will become community owner)
 * 2. Creates a new community (author automatically becomes owner)
 * 3. A second member joins (to be added as moderator)
 * 4. Owner adds the second member as moderator with can_add_moderators=false (default)
 * 5. Verify the moderator role is created with correct member_id, community_id, and timestamps
 * 6. Verify the response includes the complete moderator record with nested member and community summaries
 * 7. Verify can_add_moderators defaults to false when not specified
 */
export async function test_api_moderator_add_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. First member joins (will become community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember: IRedditLikeMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      },
    });
  // 2. Owner creates a community (author becomes owner automatically)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  // Validate owner is set correctly in community
  TestValidator.equals("community owner", community.owner.id, ownerMember.id);
  // 3. Second member joins (to be added as moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember: IRedditLikeMember.IAuthorized =
    await authorize_member_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(),
      },
    });
  // 4. Owner adds the second member as moderator with can_add_moderators=false (default - not specified)
  const moderator: IRedditLikeModerator =
    await generate_random_reddit_like_owner_moderators_create(ownerConnection, {
      body: {
        communityId: community.id,
        memberId: moderatorMember.id,
        // Not specifying canAddModerators to test default value
      },
    });
  // 5. Validate moderator record has correct member_id and community_id
  TestValidator.equals(
    "moderator member id matches",
    moderator.member.id,
    moderatorMember.id,
  );
  TestValidator.equals(
    "moderator community id matches",
    moderator.community.id,
    community.id,
  );
  // 6. Verify nested member summary matches the moderator member
  TestValidator.equals(
    "member email matches",
    moderator.member.email,
    moderatorMember.email,
  );
  TestValidator.equals(
    "member username matches",
    moderator.member.username,
    moderatorMember.username,
  );
  // 7. Verify nested community summary matches
  TestValidator.equals(
    "community name matches",
    moderator.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    moderator.community.description,
    community.description,
  );
  TestValidator.equals(
    "community owner id matches",
    moderator.community.owner.id,
    ownerMember.id,
  );
  // 8. Verify can_add_moderators defaults to false
  TestValidator.equals(
    "can_add_moderators defaults to false",
    moderator.can_add_moderators,
    false,
  );
  // 9. Verify timestamps are set correctly
  TestValidator.predicate(
    "created_at is set",
    typeof moderator.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is set",
    typeof moderator.updated_at === "string",
  );
  TestValidator.predicate(
    "deleted_at is null (active role)",
    moderator.deleted_at === null,
  );
}
