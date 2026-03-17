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
    redditCommunityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const { post_type } = props.body;
    const now = new Date().toISOString();
    const textNested =
      post_type === "text" && props.body.body
        ? {
            create: {
              id: v4(),
              created_at: now,
              updated_at: now,
              body: props.body.body,
            },
          }
        : undefined;
    const linkNested =
      post_type === "link" && props.body.url
        ? {
            create: {
              id: v4(),
              created_at: now,
              updated_at: now,
              url: props.body.url,
            },
          }
        : undefined;
    return {
      id,
      title: props.body.title,
      post_type,
      vote_score: 0,
      comment_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      author: { connect: { id: props.redditCommunityMembers.id } },
      community: { connect: { id: props.body.community_id } },
      text: textNested,
      link: linkNested,
      sortingMetric: undefined,
      snapshots: undefined,
      deletion: undefined,
      comments: undefined,
      commentSnapshots: undefined,
      votes: undefined,
      voteOfPosts: undefined,
      feedCacheEntries: undefined,
      images: undefined,
      systemLogs: undefined,
    } satisfies Prisma.reddit_community_postsCreateInput;
  }
}
