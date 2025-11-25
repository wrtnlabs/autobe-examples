import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSKarmaHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSKarmaHistory";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getCommunityBBSCitizenCitizensCitizenIdKarmaHistory(props: {
  citizen: CitizenPayload;
  citizenId: string;
}): Promise<IPageICommunityBBSKarmaHistory> {
  // Validate access permissions
  if (
    typia.assert<"admin" | "citizen">(props.citizen.type) !== "admin" &&
    props.citizen.id !== props.citizenId
  ) {
    throw new HttpException("Forbidden", 403);
  }

  // Default pagination parameters
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  // Fetch karma history records for the specified citizen
  const historyRecords =
    await MyGlobal.prisma.community_bbs_karma_history.findMany({
      where: {
        community_bbs_citizen_id: props.citizenId,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
    });

  // Count total records for pagination
  const totalRecords = await MyGlobal.prisma.community_bbs_karma_history.count({
    where: {
      community_bbs_citizen_id: props.citizenId,
      deleted_at: null,
    },
  });

  // Transform records to match ICommunityBBSKarmaHistory DTO
  // ICommunityBBSKarmaHistory is defined as string, so each item must be a JSON string
  const data = historyRecords.map((record) => {
    // Convert date fields to ISO strings, handle null safely
    const createdAt = record.created_at
      ? toISOStringSafe(record.created_at)
      : null;
    const updatedAt = record.updated_at
      ? toISOStringSafe(record.updated_at)
      : null;
    const deletedAt = record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : null;

    // Create plain object for serialization
    const karmaRecord = {
      id: record.id,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: deletedAt,
      karma: record.change_amount,
      reason: record.event_reason,
      community_bbs_citizen_id: record.community_bbs_citizen_id,
      community_bbs_post_id: record.community_bbs_post_id,
    };

    // Return as string per ICommunityBBSKarmaHistory definition
    return JSON.stringify(karmaRecord);
  });

  // Return paginated response with ICommunityBBSKarmaHistory array
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
    data: data,
  };
}
