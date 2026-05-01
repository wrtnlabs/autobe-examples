import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityHubPostCollector {
  export async function collect(props: {
    body: ICommunityHubPost.ICreate;
    communityHubCommunities: IEntity;
    communityHubMembers: IEntity;
    communityHubMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      type: props.body.type,
      title: props.body.title,
      body: props.body.body ?? null,
      url: props.body.url ?? null,
      vote_score: 0,
      comment_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.communityHubMembers.id } },
      community: { connect: { id: props.communityHubCommunities.id } },
      image:
        props.body.type === "image" && props.body.image
          ? {
              create: {
                id: v4(),
                original_path: props.body.image.file,
                thumbnail_path: props.body.image.file.replace(
                  /(\.[^.]+)$/,
                  "_thumb$1",
                ),
                byte_size: 0,
                width: 0,
                height: 0,
                mime_type: "",
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            }
          : undefined,
      comments: undefined,
    } satisfies Prisma.community_hub_postsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace CommunityHubPostCollector {
//         export async function collect(props: {
//           body: ICommunityHubPost.ICreate;
//           communityHubCommunities: IEntity; // from path parameter communityName
// communityHubMembers: IEntity; // from authorized actor
// communityHubMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       type: ...,
//       title: ...,
//       body: ...,
//       url: ...,
//       vote_score: ...,
//       comment_count: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       community: ...,
//       image: ...,
//       comments: ...,
//           } satisfies Prisma.community_hub_postsCreateInput;
//         }
//       }
//--------------------------------------------------------------