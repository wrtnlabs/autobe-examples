import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSProfile";
import { IPageICommunityBBSProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function patchCommunityBBSCitizenProfiles(props: {
  citizen: CitizenPayload;
  body: ICommunityBBSProfile.IRequest;
}): Promise<IPageICommunityBBSProfile.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = 0;

  const whereConditions: Record<string, unknown> = {
    deleted_at: null,
  };

  // IRequest is type string - this is a full-text search term
  if (props.body && props.body.length > 0) {
    const searchTerms = props.body.toLowerCase().split(/\s+/);
    whereConditions.OR = searchTerms.map((term) => ({
      OR: [
        { display_name: { contains: term, mode: "insensitive" } },
        { bio: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
      ],
    }));
  }

  // Sorting defaults to created_at desc
  const orderBy = {
    created_at: "desc" as const,
  };

  const [profiles, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_profiles.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        location: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_bbs_profiles.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: profiles.map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url || null,
      location: profile.location || null,
      created_at: toISOStringSafe(profile.created_at),
      updated_at: toISOStringSafe(profile.updated_at),
    })) as unknown as IPageICommunityBBSProfile.ISummary["data"],
  };
}
