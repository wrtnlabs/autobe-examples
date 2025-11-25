import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function deleteCommunityBBSCitizenProfilesProfileId(props: {
  citizen: CitizenPayload;
  profileId: string & tags.Format<"uuid">;
}): Promise<void> {
  const profile = await MyGlobal.prisma.community_bbs_profiles.findUnique({
    where: {
      id: props.profileId,
      citizen_id: props.citizen.id,
    },
  });

  if (!profile) {
    throw new HttpException("Profile not found or access denied", 404);
  }

  await MyGlobal.prisma.community_bbs_profiles.delete({
    where: { id: props.profileId },
  });
}
