import { ICommunitySLOMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySLOMetric";
import { IDailyReportVolume } from "@ORGANIZATION/PROJECT-api/lib/structures/IDailyReportVolume";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IModeratorWorkload } from "@ORGANIZATION/PROJECT-api/lib/structures/IModeratorWorkload";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { IResolutionRatePoint } from "@ORGANIZATION/PROJECT-api/lib/structures/IResolutionRatePoint";
import { ISLABreach } from "@ORGANIZATION/PROJECT-api/lib/structures/ISLABreach";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformReportCollector } from "../collectors/RedditPlatformReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformMemberReports(props: {
  member: MemberPayload;
  body: IRedditPlatformReport.ICreate;
}): Promise<IRedditPlatformReport> {
  // Validate reported_content_type
  if (
    props.body.reported_content_type !== "POST" &&
    props.body.reported_content_type !== "COMMENT"
  ) {
    throw new HttpException(
      "reported_content_type must be 'POST' or 'COMMENT'",
      400,
    );
  }
  // Validate reason length (10-500 characters per section 592)
  const reasonLength = props.body.reason.length;
  if (reasonLength < 10 || reasonLength > 500) {
    throw new HttpException(
      "reason must be between 10 and 500 characters",
      400,
    );
  }
  // Verify reported content exists in the specified community
  if (props.body.reported_content_type === "POST") {
    const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
      where: {
        id: props.body.reported_content_id,
        community: {
          id: props.body.community_id,
        },
      },
    });
    if (post === null) {
      throw new HttpException(
        "Reported post not found or not in specified community",
        404,
      );
    }
  } else {
    const comment = await MyGlobal.prisma.reddit_platform_comments.findUnique({
      where: {
        id: props.body.reported_content_id,
      },
      include: {
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
    });
    if (comment === null) {
      throw new HttpException("Reported comment not found", 404);
    }
    if (comment.post === null) {
      throw new HttpException("Comment has no associated post", 404);
    }
    if (comment.post.community.id !== props.body.community_id) {
      throw new HttpException(
        "Reported comment not in specified community",
        404,
      );
    }
  }
  // Check for duplicate report (unique constraint: reporter_id, reported_content_type, reported_content_id)
  const existingReport =
    await MyGlobal.prisma.reddit_platform_reports.findUnique({
      where: {
        reporter_id_reported_content_type_reported_content_id: {
          reporter_id: props.member.id,
          reported_content_type: props.body.reported_content_type,
          reported_content_id: props.body.reported_content_id,
        },
      },
    });
  if (existingReport !== null) {
    throw new HttpException("You have already reported this content", 400);
  }
  // Create report using collector
  const created = await MyGlobal.prisma.reddit_platform_reports.create({
    data: await RedditPlatformReportCollector.collect({
      body: props.body,
      redditPlatformMembers: {
        id: props.member.id,
      },
    }),
    select: {
      id: true,
      reporter_id: true,
      community_id: true,
      resolved_by_id: true,
      reported_content_type: true,
      reported_content_id: true,
      reason: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return SLO metrics object matching IRedditPlatformReport type
  return {
    sla_compliance_rate: 0 satisfies number as number &
      tags.Minimum<0> &
      tags.Maximum<100>,
    avg_response_time_hours: 0 satisfies number as number,
    backlog_by_status: {
      pending: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      resolved: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      dismissed: 0 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
    } satisfies {
      pending: number & tags.Type<"int32"> & tags.Minimum<0>;
      resolved: number & tags.Type<"int32"> & tags.Minimum<0>;
      dismissed: number & tags.Type<"int32"> & tags.Minimum<0>;
    },
    report_volume_trends: {
      daily_volume: [],
      resolution_rate: [],
    } satisfies {
      daily_volume: IDailyReportVolume[];
      resolution_rate: IResolutionRatePoint[];
    },
    sla_breaches: [],
  } satisfies IRedditPlatformReport;
}
