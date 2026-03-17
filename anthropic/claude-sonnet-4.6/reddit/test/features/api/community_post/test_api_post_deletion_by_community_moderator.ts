import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_post_deletion_by_community_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (community owner and post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {});
  typia.assert(author);
  // Step 2: Create a new community owned by the first member
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe the author/owner to their own community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a post in the community as the author
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Register a second member (the moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // Step 6: Assign the second member as a moderator (called by the owner/author)
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      authorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: moderatorMember.id,
        },
      },
    );
  typia.assert(moderator);
  // Step 7: The moderator deletes the post authored by the first member
  await api.functional.community.member.posts.erase(moderatorConnection, {
    postId: post.id,
  });
  // Step 8: Verify that attempting to delete again (or fetch) the post results in an error (404)
  await TestValidator.error("deleted post should return 404", async () => {
    await api.functional.community.member.posts.erase(moderatorConnection, {
      postId: post.id,
    });
  });
  // Step 9: Validate moderator role details
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
}
