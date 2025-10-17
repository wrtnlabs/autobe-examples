import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminKarmaLedgersKarmaLedgerId(props: {
  admin: AdminPayload;
  karmaLedgerId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.community_platform_karma_ledgers.delete({
      where: { id: props.karmaLedgerId },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new HttpException("Karma ledger not found", 404);
    }
    throw err;
  }
}
