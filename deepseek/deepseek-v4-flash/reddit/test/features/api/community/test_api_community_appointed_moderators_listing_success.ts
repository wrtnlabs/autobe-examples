import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_moderators_create } from "../../../generate/generate_random_community_platform_member_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";

export async function test_api_community_appointed_moderators_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member-A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: "owner@test.com",
      username: "owner_user",
      password: "Password1!",
    },
  });
  typia.assert(owner);
  // 2. Create a community as member-A
  const community =
    await api.functional.communityPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          images: [
            {
              name: "icon.png",
              mime_type: "image/png",
              size: typia.random<
                number & tags.Type<"int32"> & tags.Minimum<1>
              >(),
              url: typia.random<string & tags.Format<"uri">>(),
            },
          ],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Register member-B (future moderator)
  const modConnection: api.IConnection = { host: connection.host };
  const modMember = await authorize_member_join(modConnection, {
    body: {
      email: "mod1@test.com",
      username: "moderator_one",
      password: "Password1!",
    },
  });
  typia.assert(modMember);
  // 4. Appoint member-B as moderator (using owner's connection)
  const moderator =
    await api.functional.communityPlatform.member.moderators.create(
      ownerConnection,
      {
        body: {
          communityName: community.name,
          memberUsername: "moderator_one",
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. List appointed moderators with default pagination
  const result =
    await api.functional.communityPlatform.communities.appointed_moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {},
      },
    );
  typia.assert(result);
  // 6. Validate response
  TestValidator.equals("moderator count", result.data.length, 1);
  const item = result.data[0];
  TestValidator.equals("moderator member id", item.member.id, modMember.id);
  TestValidator.equals(
    "moderator username",
    item.member.username,
    "moderator_one",
  );
  TestValidator.equals("appointed by owner", item.appointedBy.id, owner.id);
  const createdTs = new Date(item.created_at).getTime();
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    () => !isNaN(createdTs) && createdTs > 0,
  );
  TestValidator.equals("pagination records", result.pagination.records, 1);
  TestValidator.equals("pagination current", result.pagination.current, 1);
  TestValidator.equals("pagination pages", result.pagination.pages, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 20);
}
