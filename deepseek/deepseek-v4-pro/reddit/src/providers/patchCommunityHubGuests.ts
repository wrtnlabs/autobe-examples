import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubGuestAtSummaryTransformer } from "../transformers/CommunityHubGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubGuests(props: {
  body: ICommunityHubGuest.IRequest;
}): Promise<IPageICommunityHubGuest.ISummary> {
  const limit = props.body.limit ?? 20;
  const page =
    props.body.page != null && props.body.page > 0 ? props.body.page : 1;
  const skip = (page - 1) * limit;
  const fingerprint = props.body.fingerprint;
  const createdFrom = props.body.created_from;
  const createdTo = props.body.created_to;
  const updatedFrom = props.body.updated_from;
  const updatedTo = props.body.updated_to;
  const cursor = props.body.cursor;
  const whereInput = {
    ...(fingerprint !== undefined && {
      fingerprint: { contains: fingerprint },
    }),
    ...((createdFrom !== undefined ||
      createdTo !== undefined ||
      cursor !== undefined) && {
      created_at: {
        ...(createdFrom !== undefined && { gte: createdFrom }),
        ...(createdTo !== undefined && { lte: createdTo }),
        ...(cursor !== undefined && { lt: cursor }),
      },
    }),
    ...((updatedFrom !== undefined || updatedTo !== undefined) && {
      updated_at: {
        ...(updatedFrom !== undefined && { gte: updatedFrom }),
        ...(updatedTo !== undefined && { lte: updatedTo }),
      },
    }),
  } satisfies Prisma.community_hub_guestsWhereInput;
  const effectiveSkip = cursor !== undefined ? 0 : skip;
  const data = await MyGlobal.prisma.community_hub_guests.findMany({
    where: whereInput,
    ...CommunityHubGuestAtSummaryTransformer.select(),
    skip: effectiveSkip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.community_hub_guests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityHubGuestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
// import { IPageICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubGuest";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubGuests(props: {
//   body: ICommunityHubGuest.IRequest;
// }): Promise<IPageICommunityHubGuest.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_guests.findMany({
//     ...CommunityHubGuestAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubGuestAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------