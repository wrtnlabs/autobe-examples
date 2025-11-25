import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { IPageIDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardModeratorConfigurations(props: {
  body: IDiscussionBoardConfiguration.IRequest;
}): Promise<IPageIDiscussionBoardConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Validate config_type_filter if provided
  const validConfigTypes = ["boolean", "number", "string", "json"];
  if (
    props.body.config_type_filter &&
    !validConfigTypes.includes(props.body.config_type_filter)
  ) {
    throw new HttpException(
      "Invalid config_type_filter. Must be one of: boolean, number, string, json",
      400,
    );
  }

  // Build WHERE conditions
  const where: Prisma.discussion_board_configurationsWhereInput = {
    AND: [
      ...(props.body.search
        ? [
            {
              OR: [
                {
                  config_key: {
                    contains: props.body.search,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
                {
                  description: {
                    contains: props.body.search,
                    mode: "insensitive" as Prisma.QueryMode,
                  },
                },
              ],
            },
          ]
        : []),
      ...(props.body.config_type_filter
        ? [{ config_type: props.body.config_type_filter }]
        : []),
    ],
  };

  // Build ORDER BY
  const orderBy: Prisma.discussion_board_configurationsOrderByWithRelationInput =
    {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";

    switch (props.body.order_by) {
      case "config_key":
        orderBy.config_key = direction;
        break;
      case "created_at":
        orderBy.created_at = direction;
        break;
      case "updated_at":
        orderBy.updated_at = direction;
        break;
      default:
        orderBy.created_at = "desc";
        break;
    }
  } else {
    // Default ordering
    orderBy.created_at = "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_configurations.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_configurations.count({ where }),
  ]);

  // Convert to API response format with proper type casting
  const pagination: IPage.IPagination = {
    current: page satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    limit: limit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    records: total satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pages: Math.ceil(total / limit) satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };

  const responseData: IDiscussionBoardConfiguration.ISummary[] = data.map(
    (config) => ({
      id: config.id as string & tags.Format<"uuid">,
      config_key: config.config_key,
      config_value: config.config_value,
      config_type: config.config_type,
      description: config.description,
      created_at: toISOStringSafe(config.created_at),
      updated_at: toISOStringSafe(config.updated_at),
    }),
  );

  return {
    pagination,
    data: responseData,
  };
}
