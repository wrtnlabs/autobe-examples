import { IEconomicBoardProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardCitizenProfile(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardProfile.IUpdate;
}): Promise<IEconomicBoardProfile> {
  const { id: citizenId } = props.citizen;
  // Find existing profile
  const profile = await MyGlobal.prisma.economic_board_profiles.findUnique({
    where: { economic_board_citizen_id: citizenId },
  });
  if (!profile) {
    throw new HttpException("Profile not found", 404);
  }
  // Update profile with correct field names as defined in schema
  const updated = await MyGlobal.prisma.economic_board_profiles.update({
    where: { id: profile.id },
    data: {
      display_name: props.body.display_name ?? profile.display_name,
      bio: props.body.bio ?? profile.bio,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updated.id,
    display_name: updated.display_name,
    bio: updated.bio,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
