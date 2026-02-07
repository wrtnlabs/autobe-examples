import { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { EconomyPoliticsBoardSearchFilterTransformer } from "../transformers/EconomyPoliticsBoardSearchFilterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomyPoliticsBoardUserFiltersFilterId(props: {
  user: UserPayload;
  filterId: string & tags.Format<"uuid">;
  body: IEconomyPoliticsBoardSearchFilter.IUpdate;
}): Promise<IEconomyPoliticsBoardSearchFilter> {
  // Verify the filter exists and belongs to the current user
  const filter =
    await MyGlobal.prisma.economy_politics_board_search_filters.findUnique({
      where: {
        id: props.filterId,
        user_id: props.user.id,
        deleted_at: null,
      },
      ...EconomyPoliticsBoardSearchFilterTransformer.select(),
    });
  if (!filter) throw new HttpException("Filter not found", 404);
  // Prepare update data (only update the timestamp)
  const updateData: Prisma.economy_politics_board_search_filtersUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  // Update the filter
  const updatedFilter =
    await MyGlobal.prisma.economy_politics_board_search_filters.update({
      where: { id: props.filterId },
      data: updateData,
      ...EconomyPoliticsBoardSearchFilterTransformer.select(),
    });
  // Transform and return
  return await EconomyPoliticsBoardSearchFilterTransformer.transform(
    updatedFilter,
  );
}
