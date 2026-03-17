import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const body: ICommunityPlatformMember.IRequest = props.body;
  if (body.created_from !== undefined && body.created_to !== undefined) {
    if (body.created_from > body.created_to) {
      throw new HttpException(
        "created_from must be less than or equal to created_to",
        400,
      );
    }
  }
  if (body.updated_from !== undefined && body.updated_to !== undefined) {
    if (body.updated_from > body.updated_to) {
      throw new HttpException(
        "updated_from must be less than or equal to updated_to",
        400,
      );
    }
  }
  if (
    body.last_signed_in_from !== undefined &&
    body.last_signed_in_to !== undefined
  ) {
    if (body.last_signed_in_from > body.last_signed_in_to) {
      throw new HttpException(
        "last_signed_in_from must be less than or equal to last_signed_in_to",
        400,
      );
    }
  }
  const page: number = body.page ?? 1;
  const limit: number = body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const orderByInput:
    | Prisma.community_platform_membersOrderByWithRelationInput
    | Prisma.community_platform_membersOrderByWithRelationInput[] =
    body.sort === undefined || body.sort === "created_at_desc"
      ? [{ created_at: "desc" }, { id: "desc" }]
      : body.sort === "created_at_asc"
        ? [{ created_at: "asc" }, { id: "asc" }]
        : body.sort === "updated_at_desc"
          ? [{ updated_at: "desc" }, { id: "desc" }]
          : body.sort === "updated_at_asc"
            ? [{ updated_at: "asc" }, { id: "asc" }]
            : body.sort === "last_signed_in_at_desc"
              ? [{ last_signed_in_at: "desc" }, { id: "desc" }]
              : body.sort === "last_signed_in_at_asc"
                ? [{ last_signed_in_at: "asc" }, { id: "asc" }]
                : body.sort === "code_asc"
                  ? [{ code: "asc" }, { id: "asc" }]
                  : body.sort === "code_desc"
                    ? [{ code: "desc" }, { id: "desc" }]
                    : body.sort === "email_asc"
                      ? [{ email: "asc" }, { id: "asc" }]
                      : body.sort === "email_desc"
                        ? [{ email: "desc" }, { id: "desc" }]
                        : body.sort === "status_asc"
                          ? [{ status: "asc" }, { id: "asc" }]
                          : body.sort === "status_desc"
                            ? [{ status: "desc" }, { id: "desc" }]
                            : (() => {
                                throw new HttpException(
                                  "Unsupported sort field",
                                  400,
                                );
                              })();
  const whereInput: Prisma.community_platform_membersWhereInput = {
    ...(body.code !== undefined && {
      code: {
        contains: body.code,
        mode: "insensitive",
      },
    }),
    ...(body.email !== undefined && {
      email: {
        contains: body.email,
        mode: "insensitive",
      },
    }),
    ...(body.email_verified !== undefined && {
      email_verified: body.email_verified,
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...((body.created_from !== undefined || body.created_to !== undefined) && {
      created_at: {
        ...(body.created_from !== undefined && {
          gte: new globalThis.Date(body.created_from),
        }),
        ...(body.created_to !== undefined && {
          lte: new globalThis.Date(body.created_to),
        }),
      },
    }),
    ...((body.updated_from !== undefined || body.updated_to !== undefined) && {
      updated_at: {
        ...(body.updated_from !== undefined && {
          gte: new globalThis.Date(body.updated_from),
        }),
        ...(body.updated_to !== undefined && {
          lte: new globalThis.Date(body.updated_to),
        }),
      },
    }),
    ...((body.last_signed_in_from !== undefined ||
      body.last_signed_in_to !== undefined) && {
      last_signed_in_at: {
        ...(body.last_signed_in_from !== undefined && {
          gte: new globalThis.Date(body.last_signed_in_from),
        }),
        ...(body.last_signed_in_to !== undefined && {
          lte: new globalThis.Date(body.last_signed_in_to),
        }),
      },
    }),
  };
  throw new HttpException("Forbidden", 403);
}
