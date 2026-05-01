import api from "@ORGANIZATION/PROJECT-api";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";

import { prepare_random_community_hub_post } from "../prepare/prepare_random_community_hub_post";

/**
 * Generate a random community hub post via the API for E2E testing.
 *
 * Prepares random post data using the prepare function, then calls the creation endpoint
 * within the specified community. The post type is randomly selected from text, link,
 * or image variants — each producing the appropriate content payload for that type.
 * The caller may override any property via the DeepPartial input to customize specific
 * fields for targeted test scenarios such as testing missing title validation, specific
 * post types, or partial image data.
 */
export async function generate_random_community_hub_communities_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubPost.ICreate>;
    params: {
      communityName: string;
    };
  }
): Promise<ICommunityHubPost> {
  const prepared: ICommunityHubPost.ICreate = prepare_random_community_hub_post(
    props.body
  );
  const result: ICommunityHubPost = await api.functional.communityHub.communities.posts.create(
    connection,
    {
      body: prepared,
      communityName: props.params.communityName,
    },
  );
  return result;
}