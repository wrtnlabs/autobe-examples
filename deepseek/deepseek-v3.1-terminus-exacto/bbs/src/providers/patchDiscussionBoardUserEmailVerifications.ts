import { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardUserEmailVerifications(props: {
  user: UserPayload;
  body: IDiscussionBoardUserEmailVerification.IRequest;
}): Promise<IPageIDiscussionBoardUserEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE conditions for each table type with appropriate Prisma types
  const buildWhereConditions = (userType: "user" | "admin" | "super_admin") => {
    const now = toISOStringSafe(new Date());
    if (userType === "user") {
      const where: Prisma.discussion_board_user_email_verificationsWhereInput =
        {};
      // Date range filtering
      if (props.body.created_at_start && props.body.created_at_end) {
        where.created_at = {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        };
      }
      if (props.body.expires_at_start && props.body.expires_at_end) {
        where.expires_at = {
          gte: props.body.expires_at_start,
          lte: props.body.expires_at_end,
        };
      }
      // Email pattern filtering
      if (props.body.email_pattern) {
        const emailPattern = props.body.email_pattern.replace(/%/g, "");
        where.user = {
          email: { contains: emailPattern },
        };
      }
      // Verification status filtering
      if (props.body.verification_status === "pending") {
        where.verified_at = null;
        where.expires_at = { gt: now };
      } else if (props.body.verification_status === "verified") {
        where.verified_at = { not: null };
      } else if (props.body.verification_status === "expired") {
        where.verified_at = null;
        where.expires_at = { lte: now };
      }
      return where;
    } else if (userType === "admin") {
      const where: Prisma.discussion_board_admin_email_verificationsWhereInput =
        {};
      // Date range filtering
      if (props.body.created_at_start && props.body.created_at_end) {
        where.created_at = {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        };
      }
      if (props.body.expires_at_start && props.body.expires_at_end) {
        where.expired_at = {
          gte: props.body.expires_at_start,
          lte: props.body.expires_at_end,
        };
      }
      // Email pattern filtering
      if (props.body.email_pattern) {
        const emailPattern = props.body.email_pattern.replace(/%/g, "");
        where.admin = {
          email: { contains: emailPattern },
        };
      }
      // Verification status filtering
      if (props.body.verification_status === "pending") {
        where.verified_at = null;
        where.expired_at = { gt: now };
      } else if (props.body.verification_status === "verified") {
        where.verified_at = { not: null };
      } else if (props.body.verification_status === "expired") {
        where.verified_at = null;
        where.expired_at = { lte: now };
      }
      return where;
    } else {
      const where: Prisma.discussion_board_super_admin_email_verificationsWhereInput =
        {};
      // Date range filtering
      if (props.body.created_at_start && props.body.created_at_end) {
        where.created_at = {
          gte: props.body.created_at_start,
          lte: props.body.created_at_end,
        };
      }
      if (props.body.expires_at_start && props.body.expires_at_end) {
        where.expired_at = {
          gte: props.body.expires_at_start,
          lte: props.body.expires_at_end,
        };
      }
      // Email pattern filtering
      if (props.body.email_pattern) {
        const emailPattern = props.body.email_pattern.replace(/%/g, "");
        where.superAdmin = {
          email: { contains: emailPattern },
        };
      }
      // Verification status filtering
      if (props.body.verification_status === "pending") {
        where.verified_at = null;
        where.expired_at = { gt: now };
      } else if (props.body.verification_status === "verified") {
        where.verified_at = { not: null };
      } else if (props.body.verification_status === "expired") {
        where.verified_at = null;
        where.expired_at = { lte: now };
      }
      return where;
    }
  };
  // Determine which tables to query based on user_type filter
  const tablesToQuery: Array<"user" | "admin" | "super_admin"> = [];
  if (!props.body.user_type) {
    tablesToQuery.push("user", "admin", "super_admin");
  } else {
    tablesToQuery.push(props.body.user_type);
  }
  // Execute queries for each required table
  const queries = tablesToQuery.map((userType) => {
    const where = buildWhereConditions(userType);
    if (userType === "user") {
      return MyGlobal.prisma.discussion_board_user_email_verifications.findMany(
        {
          where:
            where as Prisma.discussion_board_user_email_verificationsWhereInput,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          include: {
            user: {
              select: { email: true },
            },
          },
        },
      );
    } else if (userType === "admin") {
      return MyGlobal.prisma.discussion_board_admin_email_verifications.findMany(
        {
          where:
            where as Prisma.discussion_board_admin_email_verificationsWhereInput,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          include: {
            admin: {
              select: { email: true },
            },
          },
        },
      );
    } else {
      return MyGlobal.prisma.discussion_board_super_admin_email_verifications.findMany(
        {
          where:
            where as Prisma.discussion_board_super_admin_email_verificationsWhereInput,
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
          include: {
            superAdmin: {
              select: { email: true },
            },
          },
        },
      );
    }
  });
  const results = await Promise.all(queries);
  // Flatten and combine results
  const allResults = results.flat();
  // Get total count for pagination
  const countQueries = tablesToQuery.map((userType) => {
    const where = buildWhereConditions(userType);
    if (userType === "user") {
      return MyGlobal.prisma.discussion_board_user_email_verifications.count({
        where:
          where as Prisma.discussion_board_user_email_verificationsWhereInput,
      });
    } else if (userType === "admin") {
      return MyGlobal.prisma.discussion_board_admin_email_verifications.count({
        where:
          where as Prisma.discussion_board_admin_email_verificationsWhereInput,
      });
    } else {
      return MyGlobal.prisma.discussion_board_super_admin_email_verifications.count(
        {
          where:
            where as Prisma.discussion_board_super_admin_email_verificationsWhereInput,
        },
      );
    }
  });
  const counts = await Promise.all(countQueries);
  const totalCount = counts.reduce((sum, count) => sum + count, 0);
  // Transform results to ISummary format with proper type handling
  const transformedData = allResults.map((record) => {
    // Type guard to handle different record structures
    const isUserRecord = "user" in record;
    const isAdminRecord = "admin" in record;
    return {
      id: record.id as string & tags.Format<"uuid">,
      expires_at: isUserRecord
        ? toISOStringSafe((record as any).expires_at)
        : toISOStringSafe((record as any).expired_at),
      verified_at: record.verified_at
        ? toISOStringSafe(record.verified_at)
        : null,
      created_at: toISOStringSafe(record.created_at),
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    },
  };
}
