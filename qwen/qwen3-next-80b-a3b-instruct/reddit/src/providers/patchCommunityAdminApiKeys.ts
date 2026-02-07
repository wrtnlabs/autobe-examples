import { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityApiKey";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityApiKeyTransformer } from "../transformers/CommunityApiKeyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityAdminApiKeys(props: {
  admin: AdminPayload;
  body: ICommunityApiKey.IRequest;
}): Promise<IPageICommunityApiKey.ISummary> {
  // Since IRequest is {} (empty), pagination must be handled via query parameters
  // (not request body) as per operations spec, using default values.
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Request body is empty as defined in IRequest ({}), so no filters from body
  // All filtering is done through URL parameters, not request body
  // Since body is empty, we're retrieving all API keys with pagination
  const where: Prisma.community_api_keysWhereInput = {};
  // Fetch data
  const data = await MyGlobal.prisma.community_api_keys.findMany({
    take: limit,
    skip,
    where,
    orderBy: { created_at: "desc" },
    ...CommunityApiKeyTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.community_api_keys.count({ where });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityApiKeyTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
