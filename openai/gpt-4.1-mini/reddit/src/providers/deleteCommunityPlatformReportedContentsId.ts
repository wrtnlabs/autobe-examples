import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformReportedContentsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.community_platform_reported_contents.findUnique({
      where: { id: props.id },
    });
  if (!existing) throw new HttpException("Reported content not found", 404);
  await MyGlobal.prisma.community_platform_reported_contents.delete({
    where: { id: props.id },
  });
}
