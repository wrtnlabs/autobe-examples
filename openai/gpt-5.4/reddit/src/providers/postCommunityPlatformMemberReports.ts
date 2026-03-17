import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
    throw new HttpException("Invalid report target type", 400);
  }
  const createdId =
    props.body.targetType === "post"
      ? await MyGlobal.prisma.$transaction(async (tx) => {
          const post = await tx.community_platform_posts.findUniqueOrThrow({
            where: {
              id: props.body.targetId,
            },
            select: {
              id: true,
              community_platform_community_id: true,
              deleted_at: true,
            },
          });
          if (post.deleted_at !== null) {
            throw new HttpException(
              "Target content is unavailable for reporting",
              400,
            );
          }
          const report = await tx.community_platform_reports.create({
            data: await CommunityPlatformReportCollector.collect({
              body: props.body,
              member: {
                id: props.member.id,
              },
              community: {
                id: post.community_platform_community_id,
              },
            }),
            select: {
              id: true,
            },
          });
          const now = new globalThis.Date();
          await tx.community_platform_report_posts.create({
            data: {
              id: v4(),
              created_at: now,
              updated_at: now,
              report: {
                connect: {
                  id: report.id,
                },
              },
              post: {
                connect: {
                  id: post.id,
                },
              },
            },
          });
          return report.id;
        })
      : await MyGlobal.prisma.$transaction(async (tx) => {
          const comment =
            await tx.community_platform_comments.findUniqueOrThrow({
              where: {
                id: props.body.targetId,
              },
              select: {
                id: true,
                community_platform_post_id: true,
                deleted_at: true,
              },
            });
          if (comment.deleted_at !== null) {
            throw new HttpException(
              "Target content is unavailable for reporting",
              400,
            );
          }
          const post = await tx.community_platform_posts.findUniqueOrThrow({
            where: {
              id: comment.community_platform_post_id,
            },
            select: {
              id: true,
              community_platform_community_id: true,
              deleted_at: true,
            },
          });
          if (post.deleted_at !== null) {
            throw new HttpException(
              "Target content is unavailable for reporting",
              400,
            );
          }
          const report = await tx.community_platform_reports.create({
            data: await CommunityPlatformReportCollector.collect({
              body: props.body,
              member: {
                id: props.member.id,
              },
              community: {
                id: post.community_platform_community_id,
              },
            }),
            select: {
              id: true,
            },
          });
          await tx.community_platform_report_comments.create({
            data: {
              id: v4(),
              report: {
                connect: {
                  id: report.id,
                },
              },
              comment: {
                connect: {
                  id: comment.id,
                },
              },
            },
          });
          return report.id;
        });
  const report =
    await MyGlobal.prisma.community_platform_reports.findUniqueOrThrow({
      where: {
        id: createdId,
      },
      ...CommunityPlatformReportTransformer.select(),
    });
  const transformed =
    await CommunityPlatformReportTransformer.transform(report);
  return {
    id: transformed.id,
    reason: transformed.reason,
    detail: transformed.detail,
    status: transformed.status,
    resolution: transformed.resolution,
    reporter: transformed.reporter,
    community: transformed.community,
    reportedPost:
      props.body.targetType === "post" ? transformed.reportedPost : null,
    reportedComment:
      props.body.targetType === "comment" ? transformed.reportedComment : null,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
  };
}
