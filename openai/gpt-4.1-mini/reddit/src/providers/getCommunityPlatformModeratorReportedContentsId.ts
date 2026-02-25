import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformReportedContentTransformer } from "../transformers/CommunityPlatformReportedContentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorReportedContentsId(props: {
  moderator: ModeratorPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformReportedContent> {
  const reportedContent =
    await MyGlobal.prisma.community_platform_reported_contents.findUniqueOrThrow(
      {
        where: {
          id: props.id,
          deleted_at: null,
        },
        ...CommunityPlatformReportedContentTransformer.select(),
      },
    );
  return await CommunityPlatformReportedContentTransformer.transform(
    reportedContent,
  );
}
