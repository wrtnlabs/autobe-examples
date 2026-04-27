import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    communityPlatformMembers: IEntity;
    communityPlatformMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      type: props.body.type,
      title: props.body.title,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: null,
      deleted_at: null,
      author: { connect: { id: props.communityPlatformMembers.id } },
      community: { connect: { id: props.body.communityId } },
      text:
        props.body.type === "text" && props.body.body
          ? {
              create: {
                id: v4(),
                body: props.body.body,
                created_at: new Date(),
                updated_at: new Date(),
              },
            }
          : undefined,
      link:
        props.body.type === "link" && props.body.url
          ? {
              create: {
                id: v4(),
                url: props.body.url,
                domain_name: new URL(props.body.url).hostname,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      image:
        props.body.type === "image" && props.body.imageUri
          ? {
              create: {
                id: v4(),
                url: props.body.imageUri,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityPlatformPostCollector {
//         export async function collect(props: {
//           body: ICommunityPlatformPost.ICreate;
//           communityPlatformMembers: IEntity; // from authorized actor
// communityPlatformMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       type: ...,
//       title: ...,
//       vote_score: ...,
//       comment_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       author: ...,
//       community: ...,
//       reports: ...,
//       text: ...,
//       link: ...,
//       image: ...,
//       postVotes: ...,
//       comments: ...,
//       reportTargets: ...,
//           } satisfies Prisma.community_platform_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------