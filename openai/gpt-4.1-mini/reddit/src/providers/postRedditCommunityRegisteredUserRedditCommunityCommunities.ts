import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityCommunities(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityCommunity.ICreate;
}): Promise<IRedditCommunityCommunity> {
  try {
    const id = v4() as string & tags.Format<"uuid">;
    const nowISOString = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;

    const created = await MyGlobal.prisma.reddit_community_communities.create({
      data: {
        id,
        name: props.body.communityName,
        title: props.body.displayName,
        description: props.body.description ?? null,
        creator_id: props.registeredUser.id,
        created_at: nowISOString,
        updated_at: nowISOString,
        deleted_at: null,
      },
    });

    return {
      communityName: created.name,
      displayName: created.title,
      description: created.description ?? "",
      isPrivate: false, // since 'isPrivate' does not exist in created
      createdAt: toISOStringSafe(new Date(created.created_at)) as string &
        tags.Format<"date-time">,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (
        error.code === "P2002" &&
        Array.isArray(error.meta?.target) &&
        error.meta.target.includes("name")
      ) {
        throw new HttpException("Community name already exists", 400);
      }
    }
    throw error;
  }
}
