import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace CommunityPlatformPostCollector {
  function toISOStringSafe(date: Date): string {
    return date.toISOString();
  }
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
    community: IEntity;
    authorUser?: IEntity;
    authorModerator?: IEntity;
  }) {
    const id = v4();
    const now = new Date();
    // Prepare nested creates based on postType
    let postTextsCreate:
      | Prisma.community_platform_post_textsCreateWithoutPostInput[]
      | undefined = undefined;
    let postImagesCreate:
      | Prisma.community_platform_post_imagesCreateWithoutPostInput[]
      | undefined = undefined;
    let postLinkCreate:
      | Prisma.community_platform_post_linksCreateWithoutPostInput
      | undefined = undefined;
    if (
      props.body.postType === "text" &&
      typeof props.body.content === "string"
    ) {
      postTextsCreate = [
        {
          id: v4(),
          content: props.body.content,
          created_at: toISOStringSafe(now),
          updated_at: toISOStringSafe(now),
        },
      ];
    } else if (
      props.body.postType === "image" &&
      Array.isArray(props.body.imageUrls) &&
      props.body.imageUrls.length > 0
    ) {
      postImagesCreate = props.body.imageUrls.map((url: string) => ({
        id: v4(),
        url,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      }));
    } else if (
      props.body.postType === "link" &&
      typeof props.body.url === "string"
    ) {
      postLinkCreate = {
        id: v4(),
        url: props.body.url,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      };
    }
    return {
      id,
      title: props.body.title,
      post_type: props.body.postType,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
      community: { connect: { id: props.community.id } },
      authorUser: props.authorUser
        ? { connect: { id: props.authorUser.id } }
        : undefined,
      authorModerator: props.authorModerator
        ? { connect: { id: props.authorModerator.id } }
        : undefined,
      reports: undefined,
      postSnapshots: undefined,
      postTexts: postTextsCreate ? { create: postTextsCreate } : undefined,
      postImages: postImagesCreate ? { create: postImagesCreate } : undefined,
      postVotes: undefined,
      postLink: postLinkCreate ? { create: postLinkCreate } : undefined,
      postComments: undefined,
      postReports: undefined,
      moderationLogs: undefined,
      comments: undefined,
      deletionRecords: undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
