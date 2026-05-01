import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import api from "@ORGANIZATION/PROJECT-api";
import { prepare_random_community_hub_comment } from "../prepare/prepare_random_community_hub_comment";

/**
 * Generate a random reply comment attached to an existing parent comment via the API for E2E testing.
 *
 * Prepares random comment reply data using the prepare function, then calls the reply creation endpoint.
 * The reply is created as a child of the parent comment specified by commentId, with the nesting
 * depth automatically computed one level deeper than the parent. The authenticated member becomes
 * the author of the reply, and the parent comment's post comment count is incremented atomically.
 *
 * @param connection API connection with authentication context for the authoring member.
 * @param props.body Optional partial override for the comment content. When omitted, random content is generated.
 * @param props.params.commentId UUID of the parent comment to reply to. The parent must exist and must not be soft-deleted.
 * @returns The newly created reply comment with all server-computed fields: id, depth, vote_score (initialized to 0), created_at, and updated_at.
 */
export async function generate_random_community_hub_comments_reply(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityHubComment.ICreate> | undefined;
    params: {
      commentId: string;
    };
  }
): Promise<ICommunityHubComment> {
  const prepared: ICommunityHubComment.ICreate = prepare_random_community_hub_comment(
    props.body
  );
  return await api.functional.communityHub.comments.reply(
    connection,
    {
      body: prepared,
      commentId: props.params.commentId,
    },
  );
}