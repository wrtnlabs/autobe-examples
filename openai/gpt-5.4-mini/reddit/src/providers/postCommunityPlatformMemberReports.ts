import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformReportCollector } from "../collectors/CommunityPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportTransformer } from "../transformers/CommunityPlatformReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.ICreate;
}): Promise<ICommunityPlatformReport> {
  if (props.body.targetType !== "post" && props.body.targetType !== "comment") {
    throw new HttpException("Unknown target type", 400);
  }
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required", 400);
  }
  const communityId =
    props.body.targetType === "post"
      ? (
          await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
            where: { id: props.body.targetId },
            select: {
              community: {
                select: {
                  id: true,
                },
              },
            },
          })
        ).community.id
      : (
          await MyGlobal.prisma.community_platform_comments.findUniqueOrThrow({
            where: { id: props.body.targetId },
            select: {
              post: {
                select: {
                  community: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          })
        ).post.community.id;
  const created = await MyGlobal.prisma.community_platform_reports.create({
    data: await CommunityPlatformReportCollector.collect({
      body: props.body,
      community: { id: communityId },
      member: { id: props.member.id },
    }),
    ...CommunityPlatformReportTransformer.select(),
  });
  return await CommunityPlatformReportTransformer.transform(created);
}
