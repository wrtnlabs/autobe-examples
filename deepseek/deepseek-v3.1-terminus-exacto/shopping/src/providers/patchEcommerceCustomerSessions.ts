import { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCustomerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCustomerSessionAtSummaryTransformer } from "../transformers/EcommerceCustomerSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

interface WhereConditions {
  created_at?: {
    gte?: Date;
    lte?: Date;
  };
  expired_at?: {
    lte?: string;
    gt?: string;
  };
  ip?: {
    in?: string[];
  };
  OR?: Array<{
    ip?: {
      contains: string;
      mode: "insensitive";
    };
    href?: {
      contains: string;
      mode: "insensitive";
    };
    referrer?: {
      contains: string;
      mode: "insensitive";
    };
  }>;
}
export async function patchEcommerceCustomerSessions(props: {
  customer: CustomerPayload;
  body: IEcommerceCustomerSession.IRequest;
}): Promise<IPageIEcommerceCustomerSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base WHERE conditions using ISO string dates
  const baseWhere: WhereConditions = {};
  if (props.body.created_after) {
    baseWhere.created_at = { gte: new Date(props.body.created_after) };
  }
  if (props.body.created_before) {
    baseWhere.created_at = {
      ...baseWhere.created_at,
      lte: new Date(props.body.created_before),
    };
  }
  if (props.body.expired !== undefined) {
    const now = toISOStringSafe(new Date());
    baseWhere.expired_at = props.body.expired ? { lte: now } : { gt: now };
  }
  if (props.body.ip_patterns && props.body.ip_patterns.length > 0) {
    baseWhere.ip = { in: props.body.ip_patterns };
  }
  if (props.body.search) {
    baseWhere.OR = [
      { ip: { contains: props.body.search, mode: "insensitive" } },
      { href: { contains: props.body.search, mode: "insensitive" } },
      { referrer: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Determine which session types to include
  const sessionTypes = props.body.session_type
    ? [props.body.session_type]
    : ["customer", "seller", "administrator", "super_administrator"];
  // Use raw SQL for UNION ALL approach
  const sessionsQuery = `
    SELECT 
      id, 
      ip, 
      created_at, 
      expired_at,
      'customer' as session_type
    FROM ecommerce_customer_sessions 
    WHERE ${sessionTypes.includes("customer") ? buildWhereClause(baseWhere, "customer") : "1=0"}

    UNION ALL

    SELECT 
      id, 
      ip_address as ip, 
      created_at, 
      expires_at as expired_at,
      'seller' as session_type
    FROM ecommerce_seller_sessions 
    WHERE ${sessionTypes.includes("seller") ? buildWhereClause(baseWhere, "seller") : "1=0"}

    UNION ALL

    SELECT 
      id, 
      ip_address as ip, 
      created_at, 
      expires_at as expired_at,
      'administrator' as session_type
    FROM ecommerce_administrator_sessions 
    WHERE ${sessionTypes.includes("administrator") ? buildWhereClause(baseWhere, "administrator") : "1=0"}

    UNION ALL

    SELECT 
      id, 
      ip, 
      created_at, 
      expired_at,
      'super_administrator' as session_type
    FROM ecommerce_super_administrator_sessions 
    WHERE ${sessionTypes.includes("super_administrator") ? buildWhereClause(baseWhere, "super_administrator") : "1=0"}

    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${skip}
  `;
  const countQuery = `
    SELECT COUNT(*) as total FROM (
      SELECT id FROM ecommerce_customer_sessions WHERE ${sessionTypes.includes("customer") ? buildWhereClause(baseWhere, "customer") : "1=0"}
      UNION ALL
      SELECT id FROM ecommerce_seller_sessions WHERE ${sessionTypes.includes("seller") ? buildWhereClause(baseWhere, "seller") : "1=0"}
      UNION ALL
      SELECT id FROM ecommerce_administrator_sessions WHERE ${sessionTypes.includes("administrator") ? buildWhereClause(baseWhere, "administrator") : "1=0"}
      UNION ALL
      SELECT id FROM ecommerce_super_administrator_sessions WHERE ${sessionTypes.includes("super_administrator") ? buildWhereClause(baseWhere, "super_administrator") : "1=0"}
    ) as combined_sessions
  `;
  const [sessions, countResult] = await Promise.all([
    MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        ip: string;
        created_at: string;
        expired_at: string;
      }>
    >(sessionsQuery),
    MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        total: string;
      }>
    >(countQuery),
  ]);
  const total = parseInt(countResult[0].total);
  // Transform sessions using the transformer
  const transformedSessions = await ArrayUtil.asyncMap(
    sessions,
    async (session) =>
      EcommerceCustomerSessionAtSummaryTransformer.transform({
        id: session.id,
        ip: session.ip,
        href: "",
        referrer: "",
        created_at: new Date(session.created_at),
        expired_at: new Date(session.expired_at),
      }),
  );
  return {
    data: transformedSessions satisfies IEcommerceCustomerSession.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommerceCustomerSession.ISummary;
}
function buildWhereClause(
  conditions: WhereConditions,
  sessionType: string,
): string {
  // Convert Prisma conditions to SQL WHERE clause
  const clauses: string[] = [];
  if (conditions.created_at) {
    if (conditions.created_at.gte) {
      clauses.push(
        `created_at >= '${toISOStringSafe(conditions.created_at.gte)}'`,
      );
    }
    if (conditions.created_at.lte) {
      clauses.push(
        `created_at <= '${toISOStringSafe(conditions.created_at.lte)}'`,
      );
    }
  }
  if (conditions.expired_at) {
    if (conditions.expired_at.lte) {
      clauses.push(`expired_at <= '${conditions.expired_at.lte}'`);
    }
    if (conditions.expired_at.gt) {
      clauses.push(`expired_at > '${conditions.expired_at.gt}'`);
    }
  }
  if (conditions.ip && conditions.ip.in) {
    const ips = conditions.ip.in.map((ip: string) => `'${ip}'`).join(",");
    clauses.push(`ip IN (${ips})`);
  }
  if (conditions.OR) {
    const orClauses = conditions.OR.map((condition) => {
      if (condition.ip && condition.ip.contains) {
        return `ip ILIKE '%${condition.ip.contains}%'`;
      }
      if (condition.href && condition.href.contains) {
        return `href ILIKE '%${condition.href.contains}%'`;
      }
      if (condition.referrer && condition.referrer.contains) {
        return `referrer ILIKE '%${condition.referrer.contains}%'`;
      }
      return "";
    }).filter((clause: string) => clause !== "");
    if (orClauses.length > 0) {
      clauses.push(`(${orClauses.join(" OR ")})`);
    }
  }
  return clauses.length > 0 ? clauses.join(" AND ") : "1=1";
}
