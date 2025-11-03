import { IShoppingMallCartItem } from "./IShoppingMallCartItem";

export namespace IShoppingMallShoppingCartItem {
  /**
   * Patch data structure for modifying shopping cart items. All modifications
   * happen atomically.
   */
  export type IRequest = {
    /**
     * Array of shopping cart items to patch. Each item specifies SKU and
     * quantity for atomic update operations.
     */
    items: IShoppingMallCartItem.ICreate[];
  };
}
