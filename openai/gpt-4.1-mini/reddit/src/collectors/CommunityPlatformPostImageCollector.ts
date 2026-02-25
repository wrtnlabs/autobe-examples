import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(
  date: Date | string | null | undefined,
): string | null {
  if (!date) return null;
  if (typeof date === "string") return date;
  return date.toISOString();
}
export namespace CommunityPlatformPostImageCollector {
  export async function collect(props: {
    body: ICommunityPlatformPostImage.ICreate;
    communityPlatformPosts: IEntity;
  }) {
    const id: string = v4();
    const now: string = toISOStringSafe(new Date()) ?? new Date().toISOString();
    return {
      id,
      image_url: "",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      post: { connect: { id: props.communityPlatformPosts.id } },
    } satisfies Prisma.community_platform_post_imagesCreateInput;
  }
}
