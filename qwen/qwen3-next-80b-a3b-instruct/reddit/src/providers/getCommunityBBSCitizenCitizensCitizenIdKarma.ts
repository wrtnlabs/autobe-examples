import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSCitizenKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizenKarma";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getCommunityBBSCitizenCitizensCitizenIdKarma(props: {
  citizen: CitizenPayload;
  citizenId: string;
}): Promise<ICommunityBBSCitizenKarma> {
  // Validate that the authenticated citizen matches the requested citizenId
  if (props.citizen.id !== props.citizenId) {
    throw new HttpException(
      "Forbidden: Cannot view another citizen's karma",
      403,
    );
  }

  // Sum all non-deleted karma changes for the citizen
  const karmaRecords =
    await MyGlobal.prisma.community_bbs_karma_history.findMany({
      where: {
        community_bbs_citizen_id: props.citizenId, // Corrected field name from schema
        deleted_at: null,
      },
      select: {
        change_amount: true,
      },
    });

  const totalKarma = karmaRecords.reduce(
    (sum, record) => sum + record.change_amount,
    0,
  );

  // Validate the result is within bounds as per ICommunityBBSCitizenKarma definition (-100 to 1000)
  if (totalKarma < -100 || totalKarma > 1000) {
    throw new HttpException("Karma score out of valid range", 500);
  }

  // Return as number, which is已经是 ICommunityBBSCitizenKarma type (number & tags.Type<'int32'> & ...)
  // No type assertion needed because ReturnType is number and matches the equivalent branded type
  // TypeScript will accept a number where ICommunityBBSCitizenKarma is expected because it's a branded type alias of number
  return totalKarma;
}
