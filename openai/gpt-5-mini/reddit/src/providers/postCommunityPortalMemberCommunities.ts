import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPortalCommunity.ICreate;
}): Promise<ICommunityPortalCommunity> {
  const { member, body } = props;

  if (body.name === undefined || body.name === null) {
    throw new HttpException("Bad Request: name is required", 400);
  }
  if (body.is_private === undefined || body.is_private === null) {
    throw new HttpException("Bad Request: is_private is required", 400);
  }

  const allowedVisibilities = ["public", "private"];
  if (!allowedVisibilities.includes(body.visibility)) {
    throw new HttpException("Unprocessable Entity: invalid visibility", 422);
  }

  const canonicalize = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const slug = (body.slug ? body.slug : canonicalize(body.name)) || "";
  if (slug.length === 0) {
    throw new HttpException("Bad Request: slug cannot be empty", 400);
  }

  const existBySlug =
    await MyGlobal.prisma.community_portal_communities.findUnique({
      where: { slug },
    });
  if (existBySlug)
    throw new HttpException("Conflict: slug already in use", 409);

  const existByName =
    await MyGlobal.prisma.community_portal_communities.findFirst({
      where: { name: body.name, deleted_at: null },
    });
  if (existByName)
    throw new HttpException("Conflict: community name already in use", 409);

  const now = toISOStringSafe(new Date());
  const newId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.community_portal_communities.create({
    data: {
      id: newId,
      creator_user_id: member.id,
      name: body.name,
      slug,
      description: body.description ?? null,
      is_private: body.is_private,
      visibility: body.visibility,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    creator_user_id: created.creator_user_id ?? null,
    name: created.name,
    slug: created.slug,
    description: created.description ?? null,
    is_private: created.is_private,
    visibility: created.visibility,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
