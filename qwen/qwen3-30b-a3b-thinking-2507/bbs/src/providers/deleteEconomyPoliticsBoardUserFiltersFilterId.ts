import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEconomyPoliticsBoardUserFiltersFilterId(props: {
  user: UserPayload;
  filterId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify if filter exists and is not already deleted
  const filter =
    await MyGlobal.prisma.economy_politics_board_search_filters.findUnique({
      where: { id: props.filterId, deleted_at: null },
      select: { user_id: true },
    });
  if (!filter) {
    throw new HttpException("Filter not found or already deleted", 404);
  }
  // Verify user ownership
  if (filter.user_id !== props.user.id) {
    throw new HttpException(
      "You don't have permission to delete this filter",
      403,
    );
  }
  // Perform soft delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.economy_politics_board_search_filters.update({
    where: { id: props.filterId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
