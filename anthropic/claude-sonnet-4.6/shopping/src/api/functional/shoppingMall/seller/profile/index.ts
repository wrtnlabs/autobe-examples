import {
  IConnection,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { IShoppingMallSeller } from "../../../../structures/IShoppingMallSeller";

/**
 * Retrieve the currently authenticated seller's own profile.
 *
 * Returns the full seller profile of the currently logged-in seller, including
 * identity fields (id, email, shopName), account restriction flags (isBanned,
 * isSuspended), and system timestamps. The password is never exposed.
 *
 * @param props.connection
 * @path /shoppingMall/seller/profile
 * @accessor api.functional.shoppingMall.seller.profile.at
 */
export async function at(connection: IConnection): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection)
    : await PlainFetcher.fetch(
        connection,
        {
          ...at.METADATA,
          path: at.path(),
          status: null,
        },
      );
}
export namespace at {
  export type Response = IShoppingMallSeller;

  export const METADATA = {
    method: "GET",
    path: "/shoppingMall/seller/profile",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/shoppingMall/seller/profile";
  export const random = (): IShoppingMallSeller =>
    typia.random<IShoppingMallSeller>();
  export const simulate = (_connection: IConnection): Response => {
    return random();
  };
}
