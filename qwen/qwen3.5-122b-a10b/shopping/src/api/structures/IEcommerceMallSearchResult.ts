import { tags } from "typia";

import { IEcommerceMallCategory } from "./IEcommerceMallCategory";
import { IEcommerceMallSeller } from "./IEcommerceMallSeller";

export namespace IEcommerceMallSearchResult {
  /**
   * Unified search result representing a matched entity from products, categories, or sellers. Used in paginated search responses to display search results with appropriate entity-specific information. Each result includes a type discriminator to enable client-side rendering of different entity types.
   */
  export type ISummary =
    | {
        type: "product";

        /**
         * Product name
         */
        name: string;

        /**
         * Product description
         */
        description?: string | undefined;

        /**
         * Main product image URL
         */
        thumbnailUrl: string & tags.Format<"url">;

        /**
         * Product base price
         */
        basePrice: number;

        /**
         * Price range across variants if different from base price
         */
        priceRange?:
          | {
              min: number;
              max: number;
            }
          | null
          | undefined;

        /**
         * Product seller information
         */
        seller: IEcommerceMallSeller.ISummary;

        /**
         * Product category information
         */
        category: IEcommerceMallCategory.ISummary;

        /**
         * Average product rating from reviews
         */
        averageRating: (number & tags.Minimum<0> & tags.Maximum<5>) | null;

        /**
         * Total number of reviews
         */
        reviewCount: number & tags.Type<"int32"> & tags.Minimum<0>;
      }
    | {
        type: "category";

        /**
         * Category name
         */
        name: string;

        /**
         * Category description
         */
        description?: string | null | undefined;

        /**
         * Number of products in this category
         */
        productCount: number & tags.Type<"int32"> & tags.Minimum<0>;

        /**
         * Whether category has subcategories
         */
        hasSubcategories: boolean;
      }
    | {
        type: "seller";

        /**
         * Seller shop name
         */
        shopName: string;

        /**
         * Seller shop description
         */
        shopDescription?: string | null | undefined;

        /**
         * Seller approval status
         */
        approvalStatus: "pending" | "approved" | "rejected";

        /**
         * Number of products sold by this seller
         */
        productCount: number & tags.Type<"int32"> & tags.Minimum<0>;
      };
}
