import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostSnapshotCollector } from "../collectors/CommunityPlatformPostSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.ICreate;
}): Promise<ICommunityPlatformPostSnapshot> {
  if (
    props.body.visibility_state !== "active" &&
    props.body.visibility_state !== "deleted" &&
    props.body.visibility_state !== "restored"
  ) {
    throw new HttpException("Invalid visibility_state", 400);
  }
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true },
    },
  );
  try {
    const created = await MyGlobal.prisma.$transaction(async () => {
      return await MyGlobal.prisma.community_platform_post_snapshots.create({
        data: await CommunityPlatformPostSnapshotCollector.collect({
          body: props.body,
          post,
        }),
        ...CommunityPlatformPostSnapshotTransformer.select(),
      });
    });
    return await CommunityPlatformPostSnapshotTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict", 409);
    }
    throw error;
  }
}
