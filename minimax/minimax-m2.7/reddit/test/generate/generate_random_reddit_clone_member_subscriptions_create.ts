import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import api from "@ORGANIZATION/PROJECT-api";
import { prepare_random_reddit_clone_post_text_content } from "../prepare/prepare_random_reddit_clone_post_text_content";

export async function generate_random_reddit_clone_member_subscriptions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePostTextContent.ICreate>;
  }
): Promise<IRedditClonePostTextContent> {
  const prepared: IRedditClonePostTextContent.ICreate =
    prepare_random_reddit_clone_post_text_content(props.body);
  const result: IRedditClonePostTextContent =
    await api.functional.redditClone.member.subscriptions.create(connection, {
      body: prepared,
    });
  return result;
}