import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  if (date instanceof Date) return date.toISOString();
  return null;
}
export namespace CommunityPlatformPostCollector {
  export async function collect(props: {
    body: ICommunityPlatformPost.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      post_type: props.body.post_type,
      created_at: toISOStringSafe(new Date())!,
      updated_at: toISOStringSafe(new Date())!,
      deleted_at: null,
      community: { connect: { id: props.body.communityId } },
      authorUser: props.body.authorUserId
        ? { connect: { id: props.body.authorUserId } }
        : undefined,
      authorModerator: props.body.authorModeratorId
        ? { connect: { id: props.body.authorModeratorId } }
        : undefined,
    } satisfies Prisma.community_platform_postsCreateInput;
  }
}
