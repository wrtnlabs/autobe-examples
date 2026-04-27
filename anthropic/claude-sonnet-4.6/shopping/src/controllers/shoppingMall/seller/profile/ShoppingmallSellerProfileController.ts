import { TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";

import { IShoppingMallSeller } from "../../../../api/structures/IShoppingMallSeller";
import { SellerAuth } from "../../../../decorators/SellerAuth";
import { SellerPayload } from "../../../../decorators/payload/SellerPayload";
import { getShoppingMallSellerProfile } from "../../../../providers/getShoppingMallSellerProfile";

@Controller("/shoppingMall/seller/profile")
export class ShoppingmallSellerProfileController {
  /**
   * Retrieve the currently authenticated seller's own profile.
   *
   * Returns the full seller record for the logged-in seller: id, email, shopName,
   * isBanned, isSuspended, and timestamps. The password hash is never exposed.
   *
   * @param seller Authenticated seller payload from session
   */
  @TypedRoute.Get()
  public async at(
    @SellerAuth()
    seller: SellerPayload,
  ): Promise<IShoppingMallSeller> {
    try {
      return await getShoppingMallSellerProfile({ seller });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
