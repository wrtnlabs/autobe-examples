import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test successful community creation by an authenticated member.
 *
 * Validates the complete community creation flow including member registration through the join endpoint, community creation with a unique name and required description, and thorough verification of the response object's fields and structure.
 *
 * The test confirms that all response fields are correctly populated: the provided name and description are stored accurately, the icon_image defaults to null when not supplied, the subscriber_count initializes to zero, the owner relationship correctly references the authenticated member's public profile, and the created_at and updated_at timestamps are set and consistent for a newly created resource.
 *
 * 1. A new member registers and authenticates via the join endpoint to obtain an authenticated session.
 * 2. The member creates a community with a specific name and description, explicitly setting icon_image to null.
 * 3. Validates that the response community name and description match the creation input exactly.
 * 4. Validates icon_image is null and subscriber_count is initialized to 0.
 * 5. Validates that the owner field matches the authenticated member's profile across all ISummary fields.
 * 6. Validates that created_at equals updated_at, confirming the community is newly created with no modifications.
 */
export async function test_api_community_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community with specific name and description
  const communityName = RandomGenerator.paragraph({ sentences: 2 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          icon_image: null,
        },
      },
    );
  typia.assert(community);
  // 3. Validate community response matches creation input
  TestValidator.equals("name matches", community.name, communityName);
  TestValidator.equals(
    "description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals("icon_image is null", community.icon_image, null);
  TestValidator.equals(
    "subscriber_count initialized to 0",
    community.subscriber_count,
    0,
  );
  // 4. Validate owner matches the authenticated member
  TestValidator.equals("owner id matches", community.owner.id, member.id);
  TestValidator.equals(
    "owner username matches",
    community.owner.username,
    member.username,
  );
  TestValidator.equals(
    "owner display_name matches",
    community.owner.display_name,
    member.display_name,
  );
  TestValidator.equals(
    "owner avatar_uri matches",
    community.owner.avatar_uri,
    member.avatar_uri,
  );
  TestValidator.equals(
    "owner karma matches",
    community.owner.karma,
    member.karma,
  );
  // 5. Validate timestamps are consistent for a newly created community
  TestValidator.predicate(
    "created_at equals updated_at for new community",
    community.created_at === community.updated_at,
  );
}
