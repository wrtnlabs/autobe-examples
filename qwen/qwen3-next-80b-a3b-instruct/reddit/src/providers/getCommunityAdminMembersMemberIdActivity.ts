import { ICommunityMemberActivityList } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberActivityList";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminMembersMemberIdActivity(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
}): Promise<ICommunityMemberActivityList> {
  // Verify member exists and is active
  const member = await MyGlobal.prisma.community_members.findFirst({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
  });
  if (!member) {
    throw new HttpException("Member not found or deleted", 404);
  }
  // Define activity type enum for type safety
  type ActivityType = "post" | "comment" | "vote" | "subscription" | "karma";
  // Define type for each activity item
  type ActivityItem = {
    activity_type: ActivityType;
    activity_id: string & tags.Format<"uuid">;
    title: string | null;
    content: string | null;
    community_name: string | null;
    created_at: string & tags.Format<"date-time">;
  };
  const activities: ActivityItem[] = await MyGlobal.prisma.$queryRaw`
    SELECT 
      'post' as activity_type,
      p.id as activity_id,
      p.title as title,
      null::text as content,
      c.name as community_name,
      p.created_at as created_at
    FROM community_posts p
    JOIN community_members m ON p.community_member_id = m.id
    JOIN community_communities c ON p.community_id = c.id
    WHERE m.id = ${props.memberId}
    AND p.deleted_at IS NULL

    UNION ALL

    SELECT 
      'comment' as activity_type,
      c.id as activity_id,
      p.title as title,
      c.content as content,
      c2.name as community_name,
      c.created_at as created_at
    FROM community_comments c
    JOIN community_members m ON c.community_member_id = m.id
    JOIN community_posts p ON c.community_post_id = p.id
    JOIN community_communities c2 ON p.community_id = c2.id
    WHERE m.id = ${props.memberId}
    AND c.deleted_at IS NULL

    UNION ALL

    SELECT 
      'vote' as activity_type,
      pv.id as activity_id,
      p.title as title,
      null::text as content,
      c.name as community_name,
      pv.created_at as created_at
    FROM community_post_votes pv
    JOIN community_members m ON pv.member_id = m.id
    JOIN community_posts p ON pv.post_id = p.id
    JOIN community_communities c ON p.community_id = c.id
    WHERE m.id = ${props.memberId}
    AND pv.deleted_at IS NULL

    UNION ALL

    SELECT 
      'subscription' as activity_type,
      s.id as activity_id,
      null::text as title,
      null::text as content,
      c.name as community_name,
      s.created_at as created_at
    FROM community_subscriptions s
    JOIN community_members m ON s.community_member_id = m.id
    JOIN community_communities c ON s.community_community_id = c.id
    WHERE m.id = ${props.memberId}

    UNION ALL

    SELECT 
      'karma' as activity_type,
      kh.id as activity_id,
      null::text as title,
      CONCAT(
        kh.reason, 
        ': ', 
        CASE 
          WHEN kh.delta_amount > 0 THEN '+' 
          ELSE '' 
        END,
        kh.delta_amount
      ) as content,
      null::text as community_name,
      kh.created_at as created_at
    FROM community_karma_histories kh
    JOIN community_members m ON kh.mem_id = m.id
    WHERE m.id = ${props.memberId}

    ORDER BY created_at DESC
    LIMIT 50
  `;
  // Convert all datetime fields to ISO strings
  return activities.map((item) => ({
    ...item,
    created_at: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
  }));
}
