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
    redditCommunityMembers: IEntity;
    redditCommunityMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const fileName: string = `${id}${props.body.file_type === "community_icon" ? ".png" : ".jpg"}`;
    const now = new Date();
    // Extract original filename from file_uri
    const originalName: string =
      props.body.file_uri.split("/").pop() || "unknown";
    return {
      id,
      original_name: originalName,
      file_name: fileName,
      file_path: props.body.file_uri,
      mime_type: "application/octet-stream", // Default MIME type
      file_size: 0, // Placeholder file size
      file_type: props.body.file_type,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      // Conditional subtype creation based on file_type discriminator
      userAvatar:
        props.body.file_type === "avatar"
          ? {
              create: {
                id: v4(),
                member: { connect: { id: props.body.owner_id } },
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      postImage:
        props.body.file_type === "post"
          ? {
              create: {
                id: v4(),
                post: { connect: { id: props.body.owner_id } },
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
      ofCommunity:
        props.body.file_type === "community_icon"
          ? {
              create: {
                id: v4(),
                community: { connect: { id: props.body.owner_id } },
                created_at: now,
                updated_at: now,
              },
            }
          : undefined,
    } satisfies Prisma.reddit_community_filesCreateInput;
  }
}
