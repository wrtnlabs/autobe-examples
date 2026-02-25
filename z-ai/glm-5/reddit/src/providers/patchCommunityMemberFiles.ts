import { ICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityFile";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityFileAtSummaryTransformer } from "../transformers/CommunityFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberFiles(props: {
  member: MemberPayload;
  body: ICommunityFile.IRequest;
}): Promise<IPageICommunityFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sizeFilter =
    props.body.sizeMin != null || props.body.sizeMax != null
      ? {
          ...(props.body.sizeMin != null && { gte: props.body.sizeMin }),
          ...(props.body.sizeMax != null && { lte: props.body.sizeMax }),
        }
      : undefined;
  const widthFilter =
    props.body.widthMin != null || props.body.widthMax != null
      ? {
          ...(props.body.widthMin != null && { gte: props.body.widthMin }),
          ...(props.body.widthMax != null && { lte: props.body.widthMax }),
        }
      : undefined;
  const heightFilter =
    props.body.heightMin != null || props.body.heightMax != null
      ? {
          ...(props.body.heightMin != null && { gte: props.body.heightMin }),
          ...(props.body.heightMax != null && { lte: props.body.heightMax }),
        }
      : undefined;
  const createdAtFilter =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          ...(props.body.createdAtFrom != null && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo != null && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const whereInput = {
    deleted_at: null,
    ...(props.body.fileType != null && { file_type: props.body.fileType }),
    ...(props.body.status != null && { status: props.body.status }),
    ...(props.body.memberId != null && { member_id: props.body.memberId }),
    ...(props.body.mimeType != null && { mime_type: props.body.mimeType }),
    ...(props.body.originalName != null && {
      original_name: { contains: props.body.originalName, mode: "insensitive" },
    }),
    ...(sizeFilter != null && { size: sizeFilter }),
    ...(widthFilter != null && { width: widthFilter }),
    ...(heightFilter != null && { height: heightFilter }),
    ...(createdAtFilter != null && { created_at: createdAtFilter }),
  } satisfies Prisma.community_filesWhereInput;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput = (
    sortBy === "size"
      ? { size: sortOrder }
      : sortBy === "original_name"
        ? { original_name: sortOrder }
        : { created_at: sortOrder }
  ) satisfies Prisma.community_filesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_files.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
