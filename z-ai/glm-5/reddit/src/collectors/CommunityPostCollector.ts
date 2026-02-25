import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPostCollector {
  export async function collect(props: {
    body: ICommunityPost.ICreate;
    communityCommunities: IEntity;
    communityMembers: IEntity;
    communityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      text_content: props.body.text_content ?? null,
      link_url: props.body.link_url ?? null,
      image_url: props.body.image_url ?? null,
      image_thumbnail_url: null,
      vote_score: 0,
      upvote_count: 0,
      downvote_count: 0,
      comment_count: 0,
      hot_score: 0.0,
      controversy_score: 0.0,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      edited_at: null,
      deleted_at: null,
      community: { connect: { id: props.communityCommunities.id } },
      author: { connect: { id: props.communityMembers.id } },
      moderationLogPostTargets: undefined,
      snapshots: undefined,
      comments: undefined,
      postVotes: undefined,
    } satisfies Prisma.community_postsCreateInput;
  }
}
