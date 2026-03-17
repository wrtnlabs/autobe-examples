import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace RedditCommunityFileCollector {
  export async function collect(props: {
    body: IRedditCommunityFile.ICreate;
    owner_id: string;
  }) {
    const id: string = v4();
    const fileTypeMap: Record<string, string> = {
      avatar: "user_avatar",
      post: "post_image",
      community_icon: "community_icon",
    };
    const originalName: string =
      props.body.file_uri.split("/").pop()?.split(".")[0] || "file";
    const file_type = fileTypeMap[props.body.file_type];
    const createdAt = new Date();
    const updatedAt = new Date();
    const userAvatar =
      file_type === "user_avatar"
        ? {
            create: {
              id: v4(),
              file: { connect: { id } },
              user_id: props.owner_id,
              created_at: createdAt,
              updated_at: updatedAt,
              member: { connect: { id: props.owner_id } },
            },
          }
        : undefined;
    const postImage =
      file_type === "post_image"
        ? {
            create: {
              id: v4(),
              file: { connect: { id } },
              post_id: props.owner_id,
              created_at: createdAt,
              updated_at: updatedAt,
              post: { connect: { id: props.owner_id } },
            },
          }
        : undefined;
    const ofCommunity =
      file_type === "community_icon"
        ? {
            create: {
              id: v4(),
              file: { connect: { id } },
              community_id: props.owner_id,
              created_at: createdAt,
              updated_at: updatedAt,
              community: { connect: { id: props.owner_id } },
            },
          }
        : undefined;
    return {
      id,
      original_name: originalName,
      file_name: `${id}.jpg`,
      file_path: props.body.file_uri,
      mime_type: "image/jpeg",
      file_size: 0,
      file_type,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
      thumbnails: undefined,
      userAvatars: undefined,
      communityIcon: undefined,
      snapshot: undefined,
      cdnLogs: undefined,
      accessLogs: undefined,
      userAvatar,
      postImage,
      ofCommunity,
    } satisfies Prisma.reddit_community_filesCreateInput;
  }
}
