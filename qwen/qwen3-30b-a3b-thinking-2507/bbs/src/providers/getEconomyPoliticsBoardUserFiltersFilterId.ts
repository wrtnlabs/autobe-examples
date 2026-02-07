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

export async function getEconomyPoliticsBoardUserFiltersFilterId(props: {
  user: UserPayload;
  filterId: string & tags.Format<"uuid">;
}): Promise<IEconomyPoliticsBoardSearchFilter> {
  const filter =
    await MyGlobal.prisma.economy_politics_board_search_filters.findUnique({
      where: {
        id: props.filterId,
        deleted_at: null,
      },
      ...EconomyPoliticsBoardSearchFilterTransformer.select(),
    });
  if (!filter) {
    throw new HttpException("Filter not found", 404);
  }
  const isSuperAdmin =
    typia.assert<"super_admin">(props.user.type) === "super_admin";
  if (!isSuperAdmin && filter.user.id !== props.user.id) {
    throw new HttpException(
      "You don't have permission to access this filter",
      403,
    );
  }
  return await EconomyPoliticsBoardSearchFilterTransformer.transform(filter);
}
