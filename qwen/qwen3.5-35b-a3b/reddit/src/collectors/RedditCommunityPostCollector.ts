import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityPostCollector {
  export async function collect(props: {
    body: IRedditCommunityPost.ICreate;
    redditCommunityMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      author: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
      text:
        props.body.post_type === "text" && props.body.body
          ? {
              create: {
                id: v4(),
                body: props.body.body,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
              },
            }
          : undefined,
      link:
        props.body.post_type === "link" && props.body.url
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                domain_name: new URL(props.body.url).hostname,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
              },
            }
          : undefined,
      images:
        props.body.post_type === "image" && props.body.fileId
          ? {
              create: {
                id: v4(),
                reddit_community_file_id: props.body.fileId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deleted_at: null,
              },
            }
          : undefined,
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}
