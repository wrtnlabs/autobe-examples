import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReportResolution";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditReportResolutionTransformer } from "../transformers/RedditReportResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditMemberReportsReportIdResolutionsResolutionId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  resolutionId: string & tags.Format<"uuid">;
}): Promise<IRedditReportResolution> {
  const resolution =
    await MyGlobal.prisma.reddit_report_resolutions.findUniqueOrThrow({
      where: {
        id: props.resolutionId,
        reddit_report_id: props.reportId,
        deleted_at: null,
      },
      ...RedditReportResolutionTransformer.select(),
    });
  return await RedditReportResolutionTransformer.transform(resolution);
}
