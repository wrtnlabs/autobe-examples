import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformReportedContentTransformer } from "../transformers/CommunityPlatformReportedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminReportedContentsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportedContent> {
  const record =
    await MyGlobal.prisma.community_platform_reported_contents.findUniqueOrThrow(
      {
        where: { id: props.id },
        ...CommunityPlatformReportedContentTransformer.select(),
      },
    );
  return await CommunityPlatformReportedContentTransformer.transform(record);
}
